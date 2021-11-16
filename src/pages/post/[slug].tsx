import { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router'
import Image from 'next/image'
import { RichText } from 'prismic-dom';
import Prismic from '@prismicio/client'
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import React from 'react';
import Head from 'next/head';
import Header from '../../components/Header';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({post}: PostProps) {
  const router = useRouter()

  // If the page is not yet generated, this will be displayed
  // initially until getStaticProps() finishes running
  if (router.isFallback) {
    return <div>Carregando...</div>
  }

  function readingTime() {
    if (router.isFallback) {
      return 0
    }

    const totalWords = post.data.content.reduce((accWords, postContent) => {
      let postHeading = 0;
      let postBody = 0;

      if(postContent.heading){
        postHeading = postContent.heading.trim().split(/\s+/).length;
      }

      if(RichText.asText(postContent.body)){
        postBody = RichText.asText(postContent.body).trim().split(/\s+/).length;
      }

      return accWords + postHeading + postBody;
    }, 0)

    const wordsPerMinute = 200;

    return Math.ceil(totalWords / wordsPerMinute);
  }

  return (
    <>
      <Head>
        <title>{post.data.title} | spacetraveling.</title>
      </Head>

      <main className={styles.mainContainer}>
        <Header/>

        <div className={styles.postImage}>
          <Image src={post.data.banner.url} layout='fill' />
        </div>

        <section className={commonStyles.containerContent}>

          <div className={styles.post}>

            <h1>{post.data.title}</h1>

            <div className={styles.postInfo}>
              <p><FiCalendar/>
                <time>{format(new Date(post.first_publication_date), "d MMM yyyy",
                  {
                    locale: ptBR,
                  })}
                </time>
              </p>
              <p><FiUser/>{post.data.author}</p>
              <p><FiClock/>{readingTime()} min</p>
            </div>

            { post.data.content.map(postContent => {
                return (
                  <div key={postContent.heading} className={styles.postContent}>
                    <h2>{postContent.heading}</h2>
                    <article
                      dangerouslySetInnerHTML={{ __html: RichText.asHtml(postContent.body) }}
                    ></article>
                  </div>
                )
            }) }
          </div>

        </section>
      </main>
    </>
  )
}

export const getStaticPaths: GetStaticPaths<{ slug: string }> = async () => {
  const prismic = getPrismicClient();

  const response = await prismic.query([
    Prismic.predicates.at('document.type', 'post')
  ], {
    fetch: ['post.title', 'post.subtitle', 'post.author'],
    pageSize: 100,
  });

  const paths = response.results.map(post => {
    return {
      params: {slug: post.uid}
    }
  })

  return {
    paths,
    fallback: true,
  }
};

export const getStaticProps: GetStaticProps = async context => {
  const { slug } = context.params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('post', String(slug), {});

  return {
    props: {
      post: response,
    },
    revalidate: 60 * 60 * 24, // 24h = second * minute * hour
  }
};